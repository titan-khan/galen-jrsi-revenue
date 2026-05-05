import { Bot, Zap, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TrackedRecommendation, RecommendationStatus } from "@/types/agent";
import { PIPELINE_STAGES } from "@/types/actionCenter";
import { Link } from "react-router-dom";
import { format } from "date-fns";

interface PipelineTabProps {
  recommendations: TrackedRecommendation[];
}

export function PipelineTab({ recommendations }: PipelineTabProps) {
  const getRecommendationsByStage = (status: RecommendationStatus) => {
    return recommendations.filter(r => r.status === status);
  };

  const priorityColors = {
    high: "border-l-red-500",
    medium: "border-l-amber-500",
    low: "border-l-blue-500",
  };

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {PIPELINE_STAGES.map((stage) => {
          const stageRecs = getRecommendationsByStage(stage.id as RecommendationStatus);
          return (
            <div key={stage.id} className="w-72 flex-shrink-0">
              <Card className={`${stage.color} border-0`}>
                <CardHeader className="pb-2 pt-3 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{stage.label}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {stageRecs.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="space-y-2 min-h-[200px]">
                    {stageRecs.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-8">
                        No items
                      </p>
                    ) : (
                      stageRecs.map((rec) => (
                        <Card 
                          key={rec.id} 
                          className={`border-l-4 ${priorityColors[rec.priority]} bg-card shadow-sm`}
                        >
                          <CardContent className="p-3">
                            <p className="text-sm font-medium text-foreground line-clamp-2 mb-2">
                              {rec.title}
                            </p>
                            <div className="space-y-1.5 text-xs text-muted-foreground">
                              <Link
                                to={`/ai-agents/${rec.agentId}`}
                                className="flex items-center gap-1.5 hover:text-primary"
                              >
                                <Bot className="h-3 w-3" />
                                <span className="truncate">{rec.agentName}</span>
                              </Link>
                              <div className="flex items-center gap-1.5 text-emerald-600">
                                <Zap className="h-3 w-3" />
                                <span>{rec.potentialImpact}</span>
                              </div>
                              {rec.assignee && (
                                <div className="flex items-center gap-1.5">
                                  <User className="h-3 w-3" />
                                  <span>{rec.assignee}</span>
                                </div>
                              )}
                              {rec.targetCompletionDate && (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3 w-3" />
                                  <span>Due {format(new Date(rec.targetCompletionDate), "MMM d")}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
