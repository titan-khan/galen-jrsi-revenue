import { format } from "date-fns";
import { History, CheckCircle, XCircle, ArrowUpCircle, Plus, BarChart, Download } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAudit } from "@/contexts/AuditContext";
import { AuditLogEntry, AuditAction } from "@/types/audit";
import { useToast } from "@/hooks/use-toast";

interface AuditHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetId?: string;
  title?: string;
}

const actionIcons: Record<AuditAction, React.ElementType> = {
  created: Plus,
  approved: CheckCircle,
  dismissed: XCircle,
  escalated: ArrowUpCircle,
  implemented: CheckCircle,
  measured: BarChart,
  tracked: Plus,
};

const actionColors: Record<AuditAction, string> = {
  created: "text-blue-600 bg-blue-50",
  approved: "text-emerald-600 bg-emerald-50",
  dismissed: "text-muted-foreground bg-muted",
  escalated: "text-amber-600 bg-amber-50",
  implemented: "text-primary bg-primary/10",
  measured: "text-purple-600 bg-purple-50",
  tracked: "text-blue-600 bg-blue-50",
};

const actionLabels: Record<AuditAction, string> = {
  created: "Created",
  approved: "Approved",
  dismissed: "Dismissed",
  escalated: "Escalated",
  implemented: "Implemented",
  measured: "Impact Measured",
  tracked: "Tracked for Approval",
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return format(date, "MMM d, yyyy 'at' h:mm a");
}

function AuditEntryItem({ entry }: { entry: AuditLogEntry }) {
  const Icon = actionIcons[entry.action];

  return (
    <div className="flex gap-3 py-3">
      <div className={`p-2 rounded-full h-fit ${actionColors[entry.action]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm text-foreground">
            {actionLabels[entry.action]}
          </span>
          <span className="text-xs text-muted-foreground">
            by {entry.userName}
          </span>
        </div>
        {entry.reason && (
          <p className="text-sm text-muted-foreground mt-1">
            "{entry.reason}"
          </p>
        )}
        {entry.previousStatus && entry.newStatus && (
          <div className="flex items-center gap-1.5 mt-1">
            <Badge variant="outline" className="text-xs capitalize">
              {entry.previousStatus}
            </Badge>
            <span className="text-xs text-muted-foreground">→</span>
            <Badge variant="outline" className="text-xs capitalize">
              {entry.newStatus}
            </Badge>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          {formatTimestamp(entry.timestamp)}
        </p>
      </div>
    </div>
  );
}

export function AuditHistorySheet({
  open,
  onOpenChange,
  targetId,
  title,
}: AuditHistorySheetProps) {
  const { getAuditLog, getRecentActions } = useAudit();
  const { toast } = useToast();

  const entries = targetId ? getAuditLog(targetId) : getRecentActions(20);

  const handleExportCSV = () => {
    const headers = ["Timestamp", "Action", "Target", "User", "Reason", "Previous Status", "New Status"];
    const rows = entries.map((entry) => [
      format(new Date(entry.timestamp), "yyyy-MM-dd HH:mm:ss"),
      actionLabels[entry.action],
      entry.targetTitle,
      entry.userName,
      entry.reason || "",
      entry.previousStatus || "",
      entry.newStatus || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export complete",
      description: `Exported ${entries.length} audit entries to CSV`,
    });
  };


  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-muted-foreground" />
              <SheetTitle>Audit History</SheetTitle>
            </div>
            {entries.length > 0 && (
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
            )}
          </div>
          <SheetDescription>
            {title || "All recent actions"}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-4 -mx-6 px-6">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No audit history available</p>
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map((entry, index) => (
                <div key={entry.id}>
                  <AuditEntryItem entry={entry} />
                  {index < entries.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
