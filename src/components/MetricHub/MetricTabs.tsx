import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitCompare } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface MetricTabsProps {
  metricsCount?: number;
  activeTab?: string;
  onTabChange?: (value: string) => void;
}

const MetricTabs = ({ metricsCount = 0, activeTab = "following", onTabChange }: MetricTabsProps) => {
  return (
    <div className="mb-6">
      <TooltipProvider>
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="bg-muted">
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value="following"
                  className={cn(
                    "data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:font-semibold",
                    activeTab === "following" && "bg-background shadow-md font-semibold"
                  )}
                >
                  Following ({metricsCount})
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Metrics you're actively tracking</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value="browse"
                  className={cn(
                    "data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:font-semibold",
                    activeTab === "browse" && "bg-background shadow-md font-semibold"
                  )}
                >
                  Browse Metrics
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Discover metrics from your data sources</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value="relationships"
                  className={cn(
                    "data-[state=active]:bg-background data-[state=active]:shadow-md data-[state=active]:font-semibold gap-1",
                    activeTab === "relationships" && "bg-background shadow-md font-semibold"
                  )}
                >
                  <GitCompare className="h-3 w-3" />
                  Relationships
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Metric decomposition and driver trees</p>
              </TooltipContent>
            </Tooltip>
          </TabsList>
        </Tabs>
      </TooltipProvider>
    </div>
  );
};

export default MetricTabs;
