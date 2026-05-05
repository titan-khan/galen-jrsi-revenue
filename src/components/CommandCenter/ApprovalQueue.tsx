import { useState } from "react";
import { CheckCircle, XCircle, Clock, Zap, History, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTrackedRecommendations } from "@/contexts/TrackedRecommendationsContext";
import { useAudit } from "@/contexts/AuditContext";
import { Link } from "react-router-dom";
import { ApprovalReasonDialog } from "./ApprovalReasonDialog";
import { AuditHistorySheet } from "./AuditHistorySheet";
import { useToast } from "@/hooks/use-toast";

export function ApprovalQueue() {
  const { recommendations, updateStatus } = useTrackedRecommendations();
  const { logAction, getAuditLog } = useAudit();
  const { toast } = useToast();
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"approve" | "dismiss">("approve");
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [selectedRecTitle, setSelectedRecTitle] = useState<string>("");

  // Get pending approvals (proposed status)
  const pendingApprovals = recommendations
    .filter((r) => r.status === "proposed")
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  const handleApproveClick = (id: string, title: string) => {
    setSelectedRecId(id);
    setSelectedRecTitle(title);
    setSelectedAction("approve");
    setReasonDialogOpen(true);
  };

  const handleDismissClick = (id: string, title: string) => {
    setSelectedRecId(id);
    setSelectedRecTitle(title);
    setSelectedAction("dismiss");
    setReasonDialogOpen(true);
  };

  const handleReasonConfirm = (reason: string, notes?: string) => {
    if (!selectedRecId) return;

    const newStatus = selectedAction === "approve" ? "approved" : "dismissed";
    updateStatus(selectedRecId, newStatus);

    // Log to audit trail
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

  const getLastAction = (id: string) => {
    const history = getAuditLog(id);
    if (history.length === 0) return null;
    return history[0];
  };

  const priorityColors = {
    high: "text-red-600 bg-red-50 border-red-200",
    medium: "text-amber-600 bg-amber-50 border-amber-200",
    low: "text-blue-600 bg-blue-50 border-blue-200",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Approval Queue</CardTitle>
          </div>
          {pendingApprovals.length > 0 && (
            <Badge className="bg-primary">
              {pendingApprovals.length} pending
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Agent recommendations awaiting your decision
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingApprovals.length > 0 ? (
          pendingApprovals.map((rec) => (
            <div
              key={rec.id}
              className="p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-xs capitalize ${priorityColors[rec.priority]}`}
                    >
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
                    <Link
                      to={`/ai-agents/${rec.agentId}`}
                      className="text-xs text-primary hover:underline"
                    >
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
                <Button
                  size="sm"
                  className="h-7 text-xs gap-1 flex-1"
                  onClick={() => handleApproveClick(rec.id, rec.title)}
                >
                  <CheckCircle className="h-3 w-3" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 flex-1"
                  onClick={() => handleDismissClick(rec.id, rec.title)}
                >
                  <XCircle className="h-3 w-3" />
                  Dismiss
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleViewHistory(rec.id, rec.title)}
                >
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
            <Link 
              to="/action-center" 
              className="text-xs text-primary hover:underline mt-2 inline-block"
            >
              View all recommendations in Action Center →
            </Link>
          </div>
        )}
      </CardContent>

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
    </Card>
  );
}
