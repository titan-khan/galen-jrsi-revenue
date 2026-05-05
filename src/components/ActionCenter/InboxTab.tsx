import { useState } from "react";
import { CheckCircle, XCircle, Zap, History, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrackedRecommendation } from "@/types/agent";
import { Link } from "react-router-dom";
import { AssignmentPopover } from "./AssignmentPopover";
import { ApprovalReasonDialog } from "@/components/CommandCenter/ApprovalReasonDialog";
import { AuditHistorySheet } from "@/components/CommandCenter/AuditHistorySheet";
import { useTrackedRecommendations } from "@/contexts/TrackedRecommendationsContext";
import { useAudit } from "@/contexts/AuditContext";
import { useToast } from "@/hooks/use-toast";
import { Assignee } from "@/types/actionCenter";

interface InboxTabProps {
  recommendations: TrackedRecommendation[];
}

export function InboxTab({ recommendations }: InboxTabProps) {
  const { updateStatus, updateRecommendation } = useTrackedRecommendations();
  const { logAction } = useAudit();
  const { toast } = useToast();
  
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<"approve" | "dismiss">("approve");
  const [selectedRecId, setSelectedRecId] = useState<string | null>(null);
  const [selectedRecTitle, setSelectedRecTitle] = useState<string>("");

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

  const handleAssign = (recId: string, assignee: Assignee) => {
    updateRecommendation(recId, { assignee: assignee.name });
    toast({
      title: "Assignee updated",
      description: `Assigned to ${assignee.name}`,
    });
  };

  const priorityColors = {
    high: "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-900",
    medium: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-900",
    low: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-900",
  };

  if (pendingApprovals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CheckCircle className="h-12 w-12 text-emerald-500 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">All caught up!</h3>
          <p className="text-muted-foreground text-center text-sm">
            No recommendations pending approval. Check the Pipeline tab to see active items.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {pendingApprovals.map((rec) => (
        <Card key={rec.id} className="hover:bg-muted/30 transition-colors">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    variant="outline"
                    className={`text-xs capitalize ${priorityColors[rec.priority]}`}
                  >
                    {rec.priority}
                  </Badge>
                  <AssignmentPopover 
                    currentAssignee={rec.assignee} 
                    onAssign={(assignee) => handleAssign(rec.id, assignee)} 
                  />
                </div>
                <h4 className="text-sm font-medium text-foreground mb-1">
                  {rec.title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {rec.description}
                </p>
                <div className="flex items-center gap-3 text-xs">
                  <Link
                    to={`/ai-agents/${rec.agentId}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Bot className="h-3 w-3" />
                    {rec.agentName}
                  </Link>
                  <div className="flex items-center gap-1 text-emerald-600">
                    <Zap className="h-3 w-3" />
                    {rec.potentialImpact}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => handleApproveClick(rec.id, rec.title)}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => handleDismissClick(rec.id, rec.title)}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Dismiss
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => handleViewHistory(rec.id, rec.title)}
                >
                  <History className="h-3.5 w-3.5" />
                  History
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

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
    </div>
  );
}
