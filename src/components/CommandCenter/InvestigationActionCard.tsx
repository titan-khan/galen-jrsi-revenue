import { useState } from "react";
import { CheckCircle, Plus, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTrackedRecommendations } from "@/contexts/TrackedRecommendationsContext";
import { useAudit } from "@/contexts/AuditContext";
import { useToast } from "@/hooks/use-toast";

interface InvestigationActionCardProps {
  recommendation: string;
  index: number;
  riskId: string;
  riskTitle: string;
  agentId: string;
  agentName: string;
}

export function InvestigationActionCard({
  recommendation,
  index,
  riskId,
  riskTitle,
  agentId,
  agentName,
}: InvestigationActionCardProps) {
  const { recommendations, addRecommendation } = useTrackedRecommendations();
  const { logAction } = useAudit();
  const { toast } = useToast();
  const [isTracked, setIsTracked] = useState(false);

  // Check if already tracked (by matching recommendation text)
  const alreadyTracked = recommendations.some(
    (r) => r.title === recommendation || r.description === recommendation
  );

  const handleTrack = () => {
    const newRec = {
      id: `rec-${Date.now()}-${index}`,
      stepId: `step-${riskId}`,
      title: recommendation,
      priority: "medium" as const,
      description: `Action recommended from investigation of: ${riskTitle}`,
      potentialImpact: "TBD - Pending analysis",
      estimatedEffort: "TBD",
    };

    addRecommendation(newRec, agentId, agentName);

    // Log to audit trail
    logAction({
      action: "tracked",
      targetId: newRec.id,
      targetType: "recommendation",
      targetTitle: recommendation,
      metadata: {
        sourceRiskId: riskId,
        sourceRiskTitle: riskTitle,
        agentId,
        agentName,
      },
    });

    setIsTracked(true);

    toast({
      title: "Recommendation tracked",
      description: "Added to Approval Queue for review",
    });
  };

  const tracked = isTracked || alreadyTracked;

  return (
    <Card className={`transition-all ${tracked ? "bg-emerald-50/50 border-emerald-200" : ""}`}>
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm text-foreground">{recommendation}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                Action
              </Badge>
              <span className="text-xs text-muted-foreground">
                From {agentName}
              </span>
            </div>
          </div>
          <Button
            variant={tracked ? "secondary" : "default"}
            size="sm"
            className="shrink-0 gap-1.5"
            disabled={tracked}
            onClick={handleTrack}
          >
            {tracked ? (
              <>
                <CheckCircle className="h-3.5 w-3.5" />
                Tracked
              </>
            ) : (
              <>
                <Plus className="h-3.5 w-3.5" />
                Track
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
