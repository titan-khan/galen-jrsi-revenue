import { useState } from "react";
import { Inbox, GitBranch, TrendingUp, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTrackedRecommendations } from "@/contexts/TrackedRecommendationsContext";
import { ActionCenterHeader } from "@/components/ActionCenter/ActionCenterHeader";
import { InboxTab } from "@/components/ActionCenter/InboxTab";
import { PipelineTab } from "@/components/ActionCenter/PipelineTab";
import { ImpactTab } from "@/components/ActionCenter/ImpactTab";
import { AuditTab } from "@/components/ActionCenter/AuditTab";
import { ActionCenterTab } from "@/types/actionCenter";

const ActionCenter = () => {
  const [activeTab, setActiveTab] = useState<ActionCenterTab>("inbox");
  const { recommendations } = useTrackedRecommendations();

  const pendingCount = recommendations.filter((r) => r.status === "proposed").length;
  const measuredCount = recommendations.filter((r) => r.status === "measured").length;

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b bg-background">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-foreground mb-1">Action Center</h1>
          <p className="text-muted-foreground">
            Manage all agent recommendations, approvals, and track realized impact
          </p>
        </div>

        {/* Summary Stats */}
        <ActionCenterHeader recommendations={recommendations} />

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as ActionCenterTab)}
          className="mt-4"
        >
          <TabsList className="h-10">
            <TabsTrigger value="inbox" className="gap-1.5">
              <Inbox className="h-4 w-4" />
              Inbox
              {pendingCount > 0 && (
                <span className="ml-1 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pipeline" className="gap-1.5">
              <GitBranch className="h-4 w-4" />
              Pipeline
            </TabsTrigger>
            <TabsTrigger value="impact" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Impact
              {measuredCount > 0 && (
                <span className="ml-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                  {measuredCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <History className="h-4 w-4" />
              Audit
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "inbox" && <InboxTab recommendations={recommendations} />}
        {activeTab === "pipeline" && <PipelineTab recommendations={recommendations} />}
        {activeTab === "impact" && <ImpactTab recommendations={recommendations} />}
        {activeTab === "audit" && <AuditTab />}
      </div>
    </div>
  );
};

export default ActionCenter;
