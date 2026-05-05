import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Target,
  TrendingUp,
  Check,
  ChevronRight,
  ChevronLeft,
  Truck,
  ArrowRight,
  Sparkles,
  BarChart3,
  GitBranch,
} from "lucide-react";
import type { StrategicGoal } from "@/types/companyProfile";
import { getGoalOptions, getTemplatePreview, prepareLogisticsTemplate } from "@/services/templateService";
import { useMetrics } from "@/contexts/MetricsContext";
import { useRelationships } from "@/contexts/RelationshipContext";
import { useOrganization } from "@/contexts/OrganizationContext";
import { logisticsTemplateConfig } from "@/data/templates/logisticsTemplate";
import { toast } from "sonner";
import TemplateSuccessModal from "./TemplateSuccessModal";

interface IndustryTemplateWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type WizardStep = "goal" | "preview" | "applying";

const IndustryTemplateWizard = ({ open, onOpenChange }: IndustryTemplateWizardProps) => {
  const [step, setStep] = useState<WizardStep>("goal");
  const [selectedGoal, setSelectedGoal] = useState<StrategicGoal | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [applicationResult, setApplicationResult] = useState<{
    totalMetrics: number;
    totalRelationships: number;
    northStarName: string;
  } | null>(null);

  const { addBulkMetrics } = useMetrics();
  const { addBulkRelationships } = useRelationships();
  const { updateProfile } = useOrganization();

  const goalOptions = getGoalOptions();
  const preview = selectedGoal ? getTemplatePreview(selectedGoal) : null;

  const handleGoalSelect = (goal: StrategicGoal) => {
    setSelectedGoal(goal);
  };

  const handleNext = () => {
    if (step === "goal" && selectedGoal) {
      setStep("preview");
    }
  };

  const handleBack = () => {
    if (step === "preview") {
      setStep("goal");
    }
  };

  const handleApply = async () => {
    if (!selectedGoal) return;

    setStep("applying");

    // Small delay for UX
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      // Prepare template data
      const result = prepareLogisticsTemplate({
        goal: selectedGoal,
        includeRecommended: true,
        includeOptional: false,
      });

      // Apply to contexts
      addBulkMetrics(result.metricsCreated);
      addBulkRelationships(result.relationshipsCreated);

      // Update organization profile
      updateProfile({
        industry: "logistics",
        primaryGoal: selectedGoal,
        northStarMetricId: result.northStar?.metric.id,
      });

      // Store result for success modal
      setApplicationResult({
        totalMetrics: result.summary.totalMetrics,
        totalRelationships: result.summary.totalRelationships,
        northStarName: result.northStar?.metric.name || "Not set",
      });

      // Close wizard and show success
      onOpenChange(false);
      setShowSuccess(true);

      toast.success("Template applied successfully!", {
        description: `${result.summary.totalMetrics} metrics and ${result.summary.totalRelationships} relationships created`,
      });
    } catch (error) {
      toast.error("Failed to apply template");
      setStep("preview");
    }
  };

  const handleClose = () => {
    setStep("goal");
    setSelectedGoal(null);
    onOpenChange(false);
  };

  const handleSuccessClose = () => {
    setShowSuccess(false);
    setApplicationResult(null);
    setStep("goal");
    setSelectedGoal(null);
  };

  const stepProgress = step === "goal" ? 33 : step === "preview" ? 66 : 100;

  return (
    <>
      <Sheet open={open} onOpenChange={handleClose}>
        <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <SheetTitle className="text-left">Set Up Logistics Dashboard</SheetTitle>
                <SheetDescription className="text-left">
                  {logisticsTemplateConfig.description}
                </SheetDescription>
              </div>
            </div>
            <Progress value={stepProgress} className="h-1 mt-4" />
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            {/* Step 1: Goal Selection */}
            {step === "goal" && (
              <div className="space-y-4 pb-6">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    What's your primary goal?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    This determines your North Star metric and dashboard focus
                  </p>
                </div>

                <div className="grid gap-3">
                  {goalOptions.map((option) => (
                    <Card
                      key={option.value}
                      className={`cursor-pointer transition-all hover:border-primary/50 ${
                        selectedGoal === option.value
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : ""
                      }`}
                      onClick={() => handleGoalSelect(option.value)}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                        {selectedGoal === option.value && (
                          <Check className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Preview */}
            {step === "preview" && preview && (
              <div className="space-y-6 pb-6">
                {/* North Star */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Your North Star Metric
                  </h3>
                  <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                          <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-lg">
                            {preview.northStar?.metric.name}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {preview.northStar?.reasoning}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
                              Target: {preview.northStar?.metric.target?.value}
                              {preview.northStar?.metric.target?.label && ` (${preview.northStar?.metric.target?.label})`}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                {/* Metrics Preview */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Metrics to Create
                  </h3>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Required ({preview.requiredMetrics.length})
                    </div>
                    <div className="grid gap-2">
                      {preview.requiredMetrics.map((metric) => (
                        <div
                          key={metric.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                        >
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{metric.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {metric.description}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {metric.displayData.currentValue}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Recommended ({preview.recommendedMetrics.length})
                    </div>
                    <div className="grid gap-2">
                      {preview.recommendedMetrics.slice(0, 4).map((metric) => (
                        <div
                          key={metric.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                        >
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{metric.name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {metric.description}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0">
                            {metric.displayData.currentValue}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Relationships Preview */}
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-primary" />
                    Metric Relationships
                  </h3>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-primary">
                        {preview.relationshipsCount}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Pre-configured relationships based on industry patterns
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <ArrowRight className="h-3 w-3 text-green-500" />
                          <span>On-Time Delivery → Customer Satisfaction</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <ArrowRight className="h-3 w-3 text-green-500" />
                          <span>Dwell Time → On-Time Delivery</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          +{preview.relationshipsCount - 2} more relationships
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Step 3: Applying */}
            {step === "applying" && (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg">Setting up your dashboard...</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Creating metrics and relationships
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          {step !== "applying" && (
            <div className="flex justify-between pt-4 border-t mt-auto">
              {step === "preview" ? (
                <Button variant="ghost" onClick={handleBack}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              ) : (
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
              )}

              {step === "goal" ? (
                <Button onClick={handleNext} disabled={!selectedGoal}>
                  Preview
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleApply}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Apply Template
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <TemplateSuccessModal
        open={showSuccess}
        onClose={handleSuccessClose}
        result={applicationResult}
      />
    </>
  );
};

export default IndustryTemplateWizard;
