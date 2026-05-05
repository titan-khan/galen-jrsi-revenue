import { useState } from "react";
import { format } from "date-fns";
import { Download, Search, History, CheckCircle, XCircle, ArrowUpCircle, Plus, BarChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAudit } from "@/contexts/AuditContext";
import { AuditLogEntry, AuditAction } from "@/types/audit";
import { useToast } from "@/hooks/use-toast";

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
  created: "text-blue-600 bg-blue-50 dark:bg-blue-950/50",
  approved: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50",
  dismissed: "text-muted-foreground bg-muted",
  escalated: "text-amber-600 bg-amber-50 dark:bg-amber-950/50",
  implemented: "text-primary bg-primary/10",
  measured: "text-purple-600 bg-purple-50 dark:bg-purple-950/50",
  tracked: "text-blue-600 bg-blue-50 dark:bg-blue-950/50",
};

const actionLabels: Record<AuditAction, string> = {
  created: "Created",
  approved: "Approved",
  dismissed: "Dismissed",
  escalated: "Escalated",
  implemented: "Implemented",
  measured: "Impact Measured",
  tracked: "Tracked",
};

export function AuditTab() {
  const { getRecentActions } = useAudit();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const allEntries = getRecentActions(100);

  const filteredEntries = searchQuery
    ? allEntries.filter(
        (entry) =>
          entry.targetTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          entry.reason?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allEntries;

  const handleExportCSV = () => {
    const headers = ["Timestamp", "Action", "Target", "User", "Reason", "Previous Status", "New Status"];
    const rows = allEntries.map((entry) => [
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
      description: `Exported ${allEntries.length} audit entries to CSV`,
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with search and export */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search audit log..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExportCSV}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Audit entries */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            Audit Log
            <Badge variant="secondary" className="ml-2">
              {filteredEntries.length} entries
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? "No matching entries found" : "No audit history available"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => {
                const Icon = actionIcons[entry.action];
                return (
                  <div
                    key={entry.id}
                    className="flex gap-3 p-3 border rounded-lg bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className={`p-2 rounded-full h-fit ${actionColors[entry.action]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm text-foreground">
                          {actionLabels[entry.action]}
                        </span>
                        <span className="text-sm text-foreground">
                          {entry.targetTitle}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          by {entry.userName}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.timestamp), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      {entry.reason && (
                        <p className="text-sm text-muted-foreground mt-2 italic">
                          "{entry.reason}"
                        </p>
                      )}
                      {entry.previousStatus && entry.newStatus && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {entry.previousStatus}
                          </Badge>
                          <span className="text-xs text-muted-foreground">→</span>
                          <Badge variant="outline" className="text-xs capitalize">
                            {entry.newStatus}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
