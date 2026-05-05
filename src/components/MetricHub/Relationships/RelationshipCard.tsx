import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  TrendingUp, 
  TrendingDown, 
  GitCompare,
  Check,
  X,
  Pencil,
  MessageSquare,
  Sparkles,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetricRelationship, RelationshipType, RelationshipSource } from "@/types/metricRelationship";

interface RelationshipCardProps {
  relationship: MetricRelationship;
  onConfirm?: (id: string) => void;
  onDismiss?: (id: string) => void;
  onEdit?: (relationship: MetricRelationship) => void;
}

const typeConfig: Record<RelationshipType, { 
  label: string; 
  icon: typeof TrendingUp; 
  color: string;
  bgColor: string;
}> = {
  leads: {
    label: 'leads',
    icon: TrendingUp,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10'
  },
  lags: {
    label: 'lags behind',
    icon: TrendingDown,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10'
  },
  correlates: {
    label: 'correlates with',
    icon: GitCompare,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10'
  }
};

const sourceConfig: Record<RelationshipSource, { 
  label: string; 
  icon: typeof Sparkles;
}> = {
  'ai-detected': { label: 'AI Detected', icon: Sparkles },
  'industry-pattern': { label: 'Industry Pattern', icon: Sparkles },
  'user-defined': { label: 'User Defined', icon: User },
  'data-validated': { label: 'Data Validated', icon: Check }
};

export const RelationshipCard = ({
  relationship,
  onConfirm,
  onDismiss,
  onEdit
}: RelationshipCardProps) => {
  const type = typeConfig[relationship.relationshipType];
  const source = sourceConfig[relationship.source];
  const TypeIcon = type.icon;
  const SourceIcon = source.icon;

  return (
    <Card className={cn(
      "transition-all duration-200",
      relationship.isConfirmed && "border-primary/30"
    )}>
      <CardContent className="p-4">
        {/* Relationship Visual Header */}
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="secondary" className="font-medium text-xs">
            {relationship.sourceMetricName}
          </Badge>
          
          <div className="flex items-center gap-1">
            <div className={cn("p-1 rounded", type.bgColor)}>
              <TypeIcon className={cn("h-3 w-3", type.color)} />
            </div>
            <span className="text-xs text-muted-foreground">{type.label}</span>
            <ArrowRight className="h-3 w-3 text-muted-foreground" />
          </div>
          
          <Badge variant="secondary" className="font-medium text-xs">
            {relationship.targetMetricName}
          </Badge>
        </div>

        {/* Lag Period */}
        {relationship.lagPeriodDays && (
          <div className="mb-2">
            <Badge variant="outline" className="text-xs">
              ~{relationship.lagPeriodDays} day lag
            </Badge>
          </div>
        )}

        {/* Reasoning */}
        <p className="text-sm text-muted-foreground mb-3">
          {relationship.reasoning}
        </p>

        {/* User Notes */}
        {relationship.userNotes && (
          <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg mb-3">
            <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5" />
            <p className="text-xs text-muted-foreground italic">
              {relationship.userNotes}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <SourceIcon className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{source.label}</span>
            {relationship.confidenceScore !== undefined && (
              <Badge variant="outline" className="text-xs">
                {Math.round(relationship.confidenceScore * 100)}% confidence
              </Badge>
            )}
            {relationship.isConfirmed && (
              <Badge className="text-xs gap-1">
                <Check className="h-3 w-3" />
                Confirmed
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(relationship)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            
            {!relationship.isConfirmed && onConfirm && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                onClick={() => onConfirm(relationship.id)}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            
            {!relationship.isConfirmed && onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDismiss(relationship.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
