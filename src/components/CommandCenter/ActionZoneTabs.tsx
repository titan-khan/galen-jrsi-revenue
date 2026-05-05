import { useState } from "react";
import { AlertTriangle, CheckCircle, Search, XCircle, Clock, Eye, ArrowUpCircle, Zap, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCommandCenter } from "@/contexts/CommandCenterContext";
import { useTrackedRecommendations } from "@/contexts/TrackedRecommendationsContext";
import { useAudit } from "@/contexts/AuditContext";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { ApprovalReasonDialog } from "./ApprovalReasonDialog";
import { AuditHistorySheet } from "./AuditHistorySheet";
import { DismissRiskDialog } from "./DismissRiskDialog";
import { EscalateRiskDialog } from "./EscalateRiskDialog";
import { InvestigationPanel } from "./InvestigationPanel";
import type { ActionTabType } from "@/types/commandCenter";

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
  high: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
  medium: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  low: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
};

const priorityColors = {
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

export function ActionZoneTabs() {
  const { toast } = useToast();
  const { disclosureState, setActiveActionTab } = useCommandCenter();
  const { recommendations, updateStatus } = useTrackedRecommendations();
  const { logAction, getAuditLog } = useAudit();
  
  // Risk state
  const [risks, setRisks] = useState<RiskAlert[]>(INITIAL_RISKS);
  const [dismissRiskDialogOpen, setDismissRiskDialogOpen] = useState(false);
  const [escalateDialogOpen, setEscalateDialogOpen] = useState(false);
  const [investigationOpen, setInvestigationOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<RiskAlert | null>(null);

  // Approval state
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"approve" | "dismiss">("approve");
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [selectedRecTitle, setSelectedRecTitle] = useState<string>("");

  // Computed values
  const activeRisks = risks.filter((r) => r.status !== "dismissed" && r.status !== "escalated");
  const investigatingRisks = risks.filter((r) => r.status === "investigating");
  const newRiskCount = risks.filter((r) => r.status === "new").length;
  
  const pendingApprovals = recommendations
    .filter((r) => r.status === "proposed")
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  const totalActionItems = activeRisks.length + pendingApprovals.length;

  // Risk handlers
  const handleAcknowledge = (risk: RiskAlert) => {
    setRisks((prev) =>
      prev.map((r) =>
        r.id === risk.id ? { ...r, status: "investigating" as const } : r
      )
    );
    toast({ title: "Risk acknowledged", description: "Now under investigation" });
  };

  const handleDismissRiskClick = (risk: RiskAlert) => {
    setSelectedRisk(risk);
    setDismissRiskDialogOpen(true);
  };

  const handleDismissRiskConfirm = (reason: string) => {
    if (!selectedRisk) return;
    setRisks((prev) =>
      prev.map((r) =>
        r.id === selectedRisk.id
          ? { ...r, status: "dismissed" as const, dismissedReason: reason, dismissedAt: new Date().toISOString() }
          : r
      )
    );
    setDismissRiskDialogOpen(false);
    setSelectedRisk(null);
    toast({ title: "Risk dismissed", description: reason });
  };

  const handleEscalateClick = (risk: RiskAlert) => {
    setSelectedRisk(risk);
    setEscalateDialogOpen(true);
  };

  const handleEscalateConfirm = (priority: string, recipients: string[], context: string) => {
    if (!selectedRisk) return;
    setRisks((prev) =>
      prev.map((r) =>
        r.id === selectedRisk.id
          ? { ...r, status: "escalated" as const, escalatedPriority: priority, escalatedTo: recipients, escalatedContext: context, escalatedAt: new Date().toISOString() }
          : r
      )
    );
    setEscalateDialogOpen(false);
    setSelectedRisk(null);
    toast({ title: "Risk escalated", description: `Sent to ${recipients.join(", ")} with ${priority} priority` });
  };

  const handleInvestigateClick = (risk: RiskAlert) => {
    setSelectedRisk(risk);
    setInvestigationOpen(true);
  };

  // Approval handlers
  const handleApproveClick = (id: string, title: string) => {
    setSelectedRecId(id);
    setSelectedRecTitle(title);
    setSelectedAction("approve");
    setReasonDialogOpen(true);
  };

  const handleDismissApprovalClick = (id: string, title: string) => {
    setSelectedRecId(id);
    setSelectedRecTitle(title);
    setSelectedAction("dismiss");
    setReasonDialogOpen(true);
  };

  const handleReasonConfirm = (reason: string, notes?: string) => {
    if (!selectedRecId) return;
    const newStatus = selectedAction === "approve" ? "approved" : "dismissed";
    updateStatus(selectedRecId, newStatus);
    logAction({
      action: selectedAction === "approve" ? "approved" : "dismissed",
      targetId: selectedRecId,
      targetType: "recommendation",
      targetTitle: selectedRecTitle,
      reason,
      previousStatus: "proposed",
      newStatus,
      metadata: notes ? { notes } : undefined,
    });
    toast({
      title: selectedAction === "approve" ? "Recommendation approved" : "Recommendation dismissed",
      description: reason,
    });
    setReasonDialogOpen(false);
    setSelectedRecId(null);
  };

  const handleViewHistory = (id: string, title: string) => {
    setSelectedRecId(id);
    setSelectedRecTitle(title);
    setHistorySheetOpen(true);
  };

  const canAcknowledge = (risk: RiskAlert) => risk.status === "new";
  const canDismiss = (risk: RiskAlert) => ["new", "investigating", "monitoring"].includes(risk.status);
  const canEscalate = (risk: RiskAlert) => ["new", "investigating", "monitoring"].includes(risk.status);
  const canInvestigate = (risk: RiskAlert) => ["new", "investigating", "monitoring"].includes(risk.status);

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Action Required</CardTitle>
            <Badge variant="secondary">{totalActionItems} items need attention</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs 
            value={disclosureState.activeActionTab} 
            onValueChange={(v) => setActiveActionTab(v as ActionTabType)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="risks" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risks
                {activeRisks.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {activeRisks.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approvals" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Approvals
                {pendingApprovals.length > 0 && (
                  <Badge variant="outline" className="ml-1 h-5 px-1.5">
                    {pendingApprovals.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="investigating" className="gap-2">
                <Search className="h-4 w-4" />
                Investigating
                {investigatingRisks.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {investigatingRisks.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Risks Tab */}
            <TabsContent value="risks" className="mt-4 space-y-3">
              {activeRisks.length > 0 ? (
                activeRisks.map((risk) => (
                  <div
                    key={risk.id}
                    className={`p-3 border rounded-lg ${severityColors[risk.severity]}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs capitalize ${severityColors[risk.severity]}`}>
                            {risk.severity}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
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
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3 flex-wrap">
                      {canInvestigate(risk) && (
                        <Button variant="default" size="sm" className="h-7 text-xs gap-1" onClick={() => handleInvestigateClick(risk)}>
                          <Search className="h-3 w-3" />
                          Investigate
                        </Button>
                      )}
                      {canAcknowledge(risk) && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleAcknowledge(risk)}>
                          <Eye className="h-3 w-3" />
                          Acknowledge
                        </Button>
                      )}
                      {canDismiss(risk) && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleDismissRiskClick(risk)}>
                          <XCircle className="h-3 w-3" />
                          Dismiss
                        </Button>
                      )}
                      {canEscalate(risk) && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleEscalateClick(risk)}>
                          <ArrowUpCircle className="h-3 w-3" />
                          Escalate
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-medium text-foreground">No active risks</p>
                  <p className="text-xs mt-1">All risks have been addressed</p>
                </div>
              )}
            </TabsContent>

            {/* Approvals Tab */}
            <TabsContent value="approvals" className="mt-4 space-y-3">
              {pendingApprovals.length > 0 ? (
                pendingApprovals.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs capitalize ${priorityColors[rec.priority]}`}>
                            {rec.priority}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-foreground mt-2 line-clamp-1">
                          {rec.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {rec.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Link to={`/ai-agents/${rec.agentId}`} className="text-xs text-primary hover:underline">
                            {rec.agentName}
                          </Link>
                          <span className="text-xs text-muted-foreground">•</span>
                          <div className="flex items-center gap-1 text-xs text-emerald-600">
                            <Zap className="h-3 w-3" />
                            {rec.potentialImpact}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => handleApproveClick(rec.id, rec.title)}>
                        <CheckCircle className="h-3 w-3" />
                        Approve
                      </Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 flex-1" onClick={() => handleDismissApprovalClick(rec.id, rec.title)}>
                        <XCircle className="h-3 w-3" />
                        Dismiss
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleViewHistory(rec.id, rec.title)}>
                        <History className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-medium text-foreground">All caught up!</p>
                  <p className="text-xs mt-1">No recommendations pending approval</p>
                  <Link to="/action-center" className="text-xs text-primary hover:underline mt-2 inline-block">
                    View all recommendations in Action Center →
                  </Link>
                </div>
              )}
            </TabsContent>

            {/* Investigating Tab */}
            <TabsContent value="investigating" className="mt-4 space-y-3">
              {investigatingRisks.length > 0 ? (
                investigatingRisks.map((risk) => (
                  <div
                    key={risk.id}
                    className={`p-3 border rounded-lg ${severityColors[risk.severity]}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={`text-xs capitalize ${severityColors[risk.severity]}`}>
                        {risk.severity}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Under Investigation
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground line-clamp-2">
                      {risk.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {risk.source} • Started {risk.detectedAt}
                    </p>
                    <div className="flex items-center gap-1 mt-3">
                      <Button variant="default" size="sm" className="h-7 text-xs gap-1" onClick={() => handleInvestigateClick(risk)}>
                        <Search className="h-3 w-3" />
                        Continue Investigation
                      </Button>
                      {canEscalate(risk) && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleEscalateClick(risk)}>
                          <ArrowUpCircle className="h-3 w-3" />
                          Escalate
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground">No active investigations</p>
                  <p className="text-xs mt-1">Acknowledge a risk to start investigating</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <DismissRiskDialog
        risk={selectedRisk}
        open={dismissRiskDialogOpen}
        onOpenChange={setDismissRiskDialogOpen}
        onConfirm={handleDismissRiskConfirm}
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
      <ApprovalReasonDialog
        open={reasonDialogOpen}
        onOpenChange={setReasonDialogOpen}
        action={selectedAction}
        itemTitle={selectedRecTitle}
        onConfirm={handleReasonConfirm}
      />
      <AuditHistorySheet
        open={historySheetOpen}
        onOpenChange={setHistorySheetOpen}
        targetId={selectedRecId || undefined}
        title={selectedRecTitle}
      />
    </>
  );
}