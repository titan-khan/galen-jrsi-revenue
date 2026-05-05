import { useState } from "react";
import { AlertTriangle, Eye, XCircle, ArrowUpCircle, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { DismissRiskDialog } from "./DismissRiskDialog";
import { EscalateRiskDialog } from "./EscalateRiskDialog";
import { InvestigationPanel } from "./InvestigationPanel";

interface RiskAlert {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  source: string;
  agentId: string;
  potentialImpact: string;
  status: "new" | "investigating" | "monitoring" | "dismissed" | "escalated";
  detectedAt: string;
  dismissedReason?: string;
  dismissedAt?: string;
  escalatedTo?: string[];
  escalatedPriority?: string;
  escalatedContext?: string;
  escalatedAt?: string;
}

const INITIAL_RISKS: RiskAlert[] = [
  {
    id: "risk-1",
    title: "Shipping cost increase detected in Furniture category",
    severity: "high",
    source: "Profit Margin Watchdog",
    agentId: "agent-1",
    potentialImpact: "-$45K/month if unaddressed",
    status: "investigating",
    detectedAt: "2 hours ago",
  },
  {
    id: "risk-2",
    title: "Electronics return rate trending above threshold",
    severity: "medium",
    source: "Returns Root Cause Analyzer",
    agentId: "agent-2",
    potentialImpact: "Quality issue with supplier batch",
    status: "new",
    detectedAt: "4 hours ago",
  },
  {
    id: "risk-3",
    title: "Enterprise segment churn risk increasing",
    severity: "medium",
    source: "Customer Experience Guardian",
    agentId: "agent-4",
    potentialImpact: "2 key accounts showing disengagement",
    status: "monitoring",
    detectedAt: "1 day ago",
  },
];

const severityColors = {
  high: "text-red-600 bg-red-50 border-red-200",
  medium: "text-amber-600 bg-amber-50 border-amber-200",
  low: "text-blue-600 bg-blue-50 border-blue-200",
};

const statusLabels: Record<RiskAlert["status"], string> = {
  new: "New",
  investigating: "Investigating",
  monitoring: "Monitoring",
  dismissed: "Dismissed",
  escalated: "Escalated",
};

const statusColors: Record<RiskAlert["status"], string> = {
  new: "",
  investigating: "",
  monitoring: "",
  dismissed: "bg-muted text-muted-foreground",
  escalated: "bg-primary text-primary-foreground",
};

export function RiskAlertsCard() {
  const { toast } = useToast();
  const [risks, setRisks] = useState<RiskAlert[]>(INITIAL_RISKS);
  const [dismissDialogOpen, setDismissDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [investigationOpen, setInvestigationOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskAlert | null>(null);

  const activeRisks = risks.filter((r) => r.status !== "dismissed");
  const newCount = risks.filter((r) => r.status === "new").length;

  const handleAcknowledge = (risk: RiskAlert) => {
    setRisks((prev) =>
      prev.map((r) =>
        r.id === risk.id ? { ...r, status: "investigating" as const } : r
      )
    );
    toast({
      title: "Risk acknowledged",
      description: "Now under investigation",
    });
  };

  const handleDismissClick = (risk: RiskAlert) => {
    setSelectedRisk(risk);
    setDismissDialogOpen(true);
  };

  const handleDismissConfirm = (reason: string, notes?: string) => {
    if (!selectedRisk) return;

    setRisks((prev) =>
      prev.map((r) =>
        r.id === selectedRisk.id
          ? {
              ...r,
              status: "dismissed" as const,
              dismissedReason: reason,
              dismissedAt: new Date().toISOString(),
            }
          : r
      )
    );
    setDismissDialogOpen(false);
    setSelectedRisk(null);

    toast({
      title: "Risk dismissed",
      description: reason,
    });
  };

  const handleEscalateClick = (risk: RiskAlert) => {
    setSelectedRisk(risk);
    setEscalateDialogOpen(true);
  };

  const handleEscalateConfirm = (
    priority: string,
    recipients: string[],
    context: string
  ) => {
    if (!selectedRisk) return;

    setRisks((prev) =>
      prev.map((r) =>
        r.id === selectedRisk.id
          ? {
              ...r,
              status: "escalated" as const,
              escalatedPriority: priority,
              escalatedTo: recipients,
              escalatedContext: context,
              escalatedAt: new Date().toISOString(),
            }
          : r
      )
    );
    setEscalateDialogOpen(false);
    setSelectedRisk(null);

    toast({
      title: "Risk escalated",
      description: `Sent to ${recipients.join(", ")} with ${priority} priority`,
    });
  };

  const canAcknowledge = (risk: RiskAlert) => risk.status === "new";
  const canDismiss = (risk: RiskAlert) =>
    ["new", "investigating", "monitoring"].includes(risk.status);
  const canEscalate = (risk: RiskAlert) =>
    ["new", "investigating", "monitoring"].includes(risk.status);
  const canInvestigate = (risk: RiskAlert) =>
    ["new", "investigating", "monitoring"].includes(risk.status);

  const handleInvestigateClick = (risk: RiskAlert) => {
    setSelectedRisk(risk);
    setInvestigationOpen(true);
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base">Risk Alerts</CardTitle>
            </div>
            {newCount > 0 && (
              <Badge
                variant="outline"
                className="text-amber-600 border-amber-200 bg-amber-50"
              >
                {newCount} new
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Anomalies and risks affecting performance
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeRisks.map((risk) => (
            <div
              key={risk.id}
              className={`p-3 border rounded-lg ${severityColors[risk.severity]} group`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${severityColors[risk.severity]}`}
                    >
                      {risk.severity}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${statusColors[risk.status]}`}
                    >
                      {statusLabels[risk.status]}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-foreground mt-2 line-clamp-2">
                    {risk.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {risk.source} • {risk.detectedAt}
                  </p>
                  <p className="text-xs font-medium mt-1 text-foreground">
                    Impact: {risk.potentialImpact}
                  </p>
                  {risk.status === "escalated" && risk.escalatedTo && (
                    <p className="text-xs text-primary mt-1">
                      Escalated to: {risk.escalatedTo.join(", ")}
                    </p>
                  )}
                </div>
              </div>
              {risk.status !== "escalated" && (
                <div className="flex items-center gap-1 mt-3 flex-wrap">
                  {canInvestigate(risk) && (
                    <Button
                      variant="default"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleInvestigateClick(risk)}
                    >
                      <Search className="h-3 w-3" />
                      Investigate
                    </Button>
                  )}
                  {canAcknowledge(risk) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleAcknowledge(risk)}
                    >
                      <Eye className="h-3 w-3" />
                      Acknowledge
                    </Button>
                  )}
                  {canDismiss(risk) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleDismissClick(risk)}
                    >
                      <XCircle className="h-3 w-3" />
                      Dismiss
                    </Button>
                  )}
                  {canEscalate(risk) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleEscalateClick(risk)}
                    >
                      <ArrowUpCircle className="h-3 w-3" />
                      Escalate
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <DismissRiskDialog
        risk={selectedRisk}
        open={dismissDialogOpen}
        onOpenChange={setDismissDialogOpen}
        onConfirm={handleDismissConfirm}
      />

      <EscalateRiskDialog
        risk={selectedRisk}
        open={escalateDialogOpen}
        onOpenChange={setEscalateDialogOpen}
        onConfirm={handleEscalateConfirm}
      />

      <InvestigationPanel
        risk={selectedRisk}
        open={investigationOpen}
        onOpenChange={setInvestigationOpen}
      />
    </>
  );
}
