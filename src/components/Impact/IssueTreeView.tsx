import { useState } from "react";
import { ChevronRight, ChevronDown, TrendingUp, Shield, Globe, HelpCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAttribution } from "@/contexts/AttributionContext";
import { ImpactCategory } from "@/types/attribution";
import { cn } from "@/lib/utils";

interface TreeNode {
  id: string;
  label: string;
  value: number;
  percentage: number;
  category?: ImpactCategory;
  children?: TreeNode[];
}

interface IssueTreeViewProps {
  onNodeClick?: (category: ImpactCategory) => void;
}

export function IssueTreeView({ onNodeClick }: IssueTreeViewProps) {
  const { performanceSummary, formatCurrency } = useAttribution();

  if (!performanceSummary) return null;

  const { totalChange, totalChangePercentage, attributions, period, metricName } = performanceSummary;

  // Build tree structure
  const galenGrowthItems = attributions.filter(a => a.category === 'galen-growth');
  const galenRiskItems = attributions.filter(a => a.category === 'galen-risk');
  const externalItems = attributions.filter(a => a.category.startsWith('external'));
  const unexplainedItems = attributions.filter(a => a.category === 'unexplained');

  const galenTotal = galenGrowthItems.reduce((s, a) => s + a.value, 0) + galenRiskItems.reduce((s, a) => s + a.value, 0);
  const externalTotal = externalItems.reduce((s, a) => s + a.value, 0);
  const unexplainedTotal = unexplainedItems.reduce((s, a) => s + a.value, 0);

  const buildTreeData = (): TreeNode => {
    const galenChildren: TreeNode[] = [];
    
    const growthTotal = galenGrowthItems.reduce((s, a) => s + a.value, 0);
    if (growthTotal > 0) {
      galenChildren.push({
        id: 'galen-growth',
        label: 'Growth Drivers',
        value: growthTotal,
        percentage: (growthTotal / totalChange) * 100,
        category: 'galen-growth',
        children: galenGrowthItems.map(a => ({
          id: a.id,
          label: a.label,
          value: a.value,
          percentage: a.percentage,
          category: 'galen-growth' as ImpactCategory,
        })),
      });
    }
    
    const riskTotal = galenRiskItems.reduce((s, a) => s + a.value, 0);
    if (riskTotal > 0) {
      galenChildren.push({
        id: 'galen-risk',
        label: 'Risk Mitigation',
        value: riskTotal,
        percentage: (riskTotal / totalChange) * 100,
        category: 'galen-risk',
        children: galenRiskItems.map(a => ({
          id: a.id,
          label: a.label,
          value: a.value,
          percentage: a.percentage,
          category: 'galen-risk' as ImpactCategory,
        })),
      });
    }

    const rootChildren: TreeNode[] = [];
    
    if (galenTotal > 0) {
      rootChildren.push({
        id: 'galen',
        label: 'Galen-Driven Impact',
        value: galenTotal,
        percentage: (galenTotal / totalChange) * 100,
        category: 'galen-growth',
        children: galenChildren,
      });
    }
    
    if (externalTotal > 0) {
      rootChildren.push({
        id: 'external',
        label: 'External Factors',
        value: externalTotal,
        percentage: (externalTotal / totalChange) * 100,
        category: 'external-market',
        children: externalItems.map(a => ({
          id: a.id,
          label: a.label,
          value: a.value,
          percentage: a.percentage,
          category: a.category,
        })),
      });
    }
    
    if (unexplainedTotal > 0) {
      rootChildren.push({
        id: 'unexplained',
        label: 'Unexplained Variance',
        value: unexplainedTotal,
        percentage: (unexplainedTotal / totalChange) * 100,
        category: 'unexplained',
      });
    }

    return {
      id: 'root',
      label: `Why did ${metricName} grow ${totalChangePercentage.toFixed(1)}%?`,
      value: totalChange,
      percentage: 100,
      children: rootChildren,
    };
  };

  const treeData = buildTreeData();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Issue Tree</CardTitle>
        <p className="text-xs text-muted-foreground">
          MECE breakdown of {period.label} performance
        </p>
      </CardHeader>
      <CardContent>
        <TreeNodeComponent node={treeData} level={0} onNodeClick={onNodeClick} formatCurrency={formatCurrency} />
      </CardContent>
    </Card>
  );
}

interface TreeNodeComponentProps {
  node: TreeNode;
  level: number;
  onNodeClick?: (category: ImpactCategory) => void;
  formatCurrency: (value: number) => string;
}

function TreeNodeComponent({ node, level, onNodeClick, formatCurrency }: TreeNodeComponentProps) {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = node.children && node.children.length > 0;

  const getCategoryIcon = (category?: ImpactCategory) => {
    if (!category) return null;
    if (category === 'galen-growth') return TrendingUp;
    if (category === 'galen-risk') return Shield;
    if (category.startsWith('external')) return Globe;
    if (category === 'unexplained') return HelpCircle;
    return null;
  };

  const getCategoryColor = (category?: ImpactCategory) => {
    if (!category) return 'text-foreground';
    if (category === 'galen-growth') return 'text-emerald-600 dark:text-emerald-400';
    if (category === 'galen-risk') return 'text-blue-600 dark:text-blue-400';
    if (category.startsWith('external')) return 'text-slate-600 dark:text-slate-400';
    if (category === 'unexplained') return 'text-amber-600 dark:text-amber-400';
    return 'text-foreground';
  };

  const Icon = getCategoryIcon(node.category);

  return (
    <div className={cn("border-l-2 border-muted", level === 0 && "border-l-0")}>
      <div 
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-r-lg hover:bg-muted/50 transition-colors",
          level > 0 && "ml-4",
          node.category && "cursor-pointer"
        )}
        onClick={() => {
          if (hasChildren) setIsExpanded(!isExpanded);
          if (node.category && onNodeClick) onNodeClick(node.category);
        }}
      >
        {hasChildren ? (
          <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-5" />
        )}

        {Icon && <Icon className={cn("h-4 w-4", getCategoryColor(node.category))} />}

        <span className={cn(
          "flex-1 text-sm",
          level === 0 ? "font-semibold" : "font-medium",
          getCategoryColor(node.category)
        )}>
          {node.label}
        </span>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(node.value)}
          </span>
          <Badge variant="outline" className="text-[10px] px-1.5">
            {node.percentage.toFixed(1)}%
          </Badge>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="ml-4">
          {node.children!.map((child) => (
            <TreeNodeComponent 
              key={child.id} 
              node={child} 
              level={level + 1} 
              onNodeClick={onNodeClick}
              formatCurrency={formatCurrency}
            />
          ))}
        </div>
      )}
    </div>
  );
}
