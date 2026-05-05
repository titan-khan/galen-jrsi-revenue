import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Network, 
  TrendingUp, 
  TrendingDown, 
  GitCompare,
  ZoomIn,
  ZoomOut,
  Maximize2
} from "lucide-react";
import { type MetricRelationship, type RelationshipType } from "@/types/metricRelationship";

interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  connections: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType;
  lagDays?: number;
  confidence?: number;
}

interface MetricRelationshipGraphProps {
  relationships: MetricRelationship[];
  onNodeClick?: (metricId: string, metricName: string) => void;
  onEdgeClick?: (relationship: MetricRelationship) => void;
}

const typeConfig: Record<RelationshipType, { 
  color: string; 
  label: string;
  icon: typeof TrendingUp;
}> = {
  leads: { color: '#3b82f6', label: 'Leads', icon: TrendingUp },
  lags: { color: '#f97316', label: 'Lags', icon: TrendingDown },
  correlates: { color: '#a855f7', label: 'Correlates', icon: GitCompare }
};

export const MetricRelationshipGraph = ({
  relationships,
  onNodeClick,
  onEdgeClick
}: MetricRelationshipGraphProps) => {
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Build nodes and edges from relationships
  const { nodes, edges } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const edgeList: GraphEdge[] = [];

    relationships.forEach(rel => {
      // Add source node
      if (!nodeMap.has(rel.sourceMetricId)) {
        nodeMap.set(rel.sourceMetricId, {
          id: rel.sourceMetricId,
          name: rel.sourceMetricName,
          x: 0,
          y: 0,
          connections: 0
        });
      }
      // Add target node
      if (!nodeMap.has(rel.targetMetricId)) {
        nodeMap.set(rel.targetMetricId, {
          id: rel.targetMetricId,
          name: rel.targetMetricName,
          x: 0,
          y: 0,
          connections: 0
        });
      }

      // Increment connection counts
      const source = nodeMap.get(rel.sourceMetricId)!;
      const target = nodeMap.get(rel.targetMetricId)!;
      source.connections++;
      target.connections++;

      // Add edge
      edgeList.push({
        id: rel.id,
        source: rel.sourceMetricId,
        target: rel.targetMetricId,
        type: rel.relationshipType,
        lagDays: rel.lagPeriodDays,
        confidence: rel.confidenceScore
      });
    });

    // Position nodes in a circle
    const nodeArray = Array.from(nodeMap.values());
    const centerX = 200;
    const centerY = 150;
    const radius = 100;

    nodeArray.forEach((node, i) => {
      const angle = (2 * Math.PI * i) / nodeArray.length - Math.PI / 2;
      node.x = centerX + radius * Math.cos(angle);
      node.y = centerY + radius * Math.sin(angle);
    });

    return { nodes: nodeArray, edges: edgeList };
  }, [relationships]);

  // Find relationships by edge for click handling
  const getRelationshipById = (id: string) => 
    relationships.find(r => r.id === id);

  // Calculate arrow path for directed edge
  const getEdgePath = (sourceNode: GraphNode, targetNode: GraphNode) => {
    const dx = targetNode.x - sourceNode.x;
    const dy = targetNode.y - sourceNode.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Shorten path to not overlap with nodes
    const nodeRadius = 28;
    const startX = sourceNode.x + (dx / length) * nodeRadius;
    const startY = sourceNode.y + (dy / length) * nodeRadius;
    const endX = targetNode.x - (dx / length) * (nodeRadius + 8);
    const endY = targetNode.y - (dy / length) * (nodeRadius + 8);

    // Add curve
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    const curveOffset = 20;
    const perpX = -dy / length * curveOffset;
    const perpY = dx / length * curveOffset;
    const ctrlX = midX + perpX;
    const ctrlY = midY + perpY;

    return `M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`;
  };

  const handleNodeClick = (node: GraphNode) => {
    setSelectedNode(selectedNode === node.id ? null : node.id);
    onNodeClick?.(node.id, node.name);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 2));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => setZoom(1);

  if (relationships.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Network className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            No relationships to visualize yet. Confirm AI suggestions or define your own.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Network className="h-4 w-4 text-primary" />
              Relationship Graph
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Visualize how metrics influence each other
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomOut}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleZoomIn}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Legend */}
        <div className="flex items-center gap-4 mb-3 text-xs">
          {Object.entries(typeConfig).map(([type, config]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div 
                className="w-4 h-0.5 rounded-full" 
                style={{ backgroundColor: config.color }}
              />
              <span className="text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>

        {/* Graph SVG */}
        <div className="border rounded-lg bg-muted/30 overflow-hidden">
          <svg 
            viewBox="0 0 400 300" 
            className="w-full h-64"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            <defs>
              {/* Arrow markers for each type */}
              {Object.entries(typeConfig).map(([type, config]) => (
                <marker
                  key={type}
                  id={`arrow-${type}`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={config.color} />
                </marker>
              ))}
            </defs>

            {/* Edges */}
            <TooltipProvider>
              {edges.map(edge => {
                const sourceNode = nodes.find(n => n.id === edge.source);
                const targetNode = nodes.find(n => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const isHovered = hoveredEdge === edge.id;
                const isConnectedToSelected = selectedNode === edge.source || selectedNode === edge.target;
                const opacity = selectedNode 
                  ? isConnectedToSelected ? 1 : 0.2
                  : isHovered ? 1 : 0.7;

                return (
                  <Tooltip key={edge.id}>
                    <TooltipTrigger asChild>
                      <g
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredEdge(edge.id)}
                        onMouseLeave={() => setHoveredEdge(null)}
                        onClick={() => onEdgeClick?.(getRelationshipById(edge.id)!)}
                      >
                        <path
                          d={getEdgePath(sourceNode, targetNode)}
                          fill="none"
                          stroke={typeConfig[edge.type].color}
                          strokeWidth={isHovered ? 3 : 2}
                          strokeOpacity={opacity}
                          markerEnd={`url(#arrow-${edge.type})`}
                          className="transition-all duration-200"
                        />
                        {edge.lagDays && (
                          <text
                            x={(sourceNode.x + targetNode.x) / 2}
                            y={(sourceNode.y + targetNode.y) / 2 - 8}
                            textAnchor="middle"
                            className="text-[9px] fill-muted-foreground"
                            opacity={opacity}
                          >
                            {edge.lagDays}d
                          </text>
                        )}
                      </g>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <p className="font-medium text-xs">
                        {sourceNode.name} → {targetNode.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {typeConfig[edge.type].label}
                        {edge.lagDays && ` • ${edge.lagDays} day lag`}
                        {edge.confidence && ` • ${Math.round(edge.confidence * 100)}% confidence`}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>

            {/* Nodes */}
            <TooltipProvider>
              {nodes.map(node => {
                const isHovered = hoveredNode === node.id;
                const isSelected = selectedNode === node.id;
                const isConnected = edges.some(
                  e => (e.source === node.id || e.target === node.id) && 
                       (e.source === selectedNode || e.target === selectedNode)
                );
                const opacity = selectedNode 
                  ? isSelected || isConnected ? 1 : 0.3
                  : 1;

                return (
                  <Tooltip key={node.id}>
                    <TooltipTrigger asChild>
                      <g
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                        onClick={() => handleNodeClick(node)}
                        style={{ opacity }}
                      >
                        {/* Node circle */}
                        <circle
                          cx={node.x}
                          cy={node.y}
                          r={isHovered || isSelected ? 30 : 28}
                          className={`
                            fill-background stroke-2 transition-all duration-200
                            ${isSelected ? 'stroke-primary' : 'stroke-border'}
                          `}
                          filter={isHovered || isSelected ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : undefined}
                        />
                        
                        {/* Connection count badge */}
                        <circle
                          cx={node.x + 20}
                          cy={node.y - 20}
                          r={9}
                          className="fill-primary"
                        />
                        <text
                          x={node.x + 20}
                          y={node.y - 16}
                          textAnchor="middle"
                          className="text-[9px] fill-primary-foreground font-medium"
                        >
                          {node.connections}
                        </text>

                        {/* Node label (truncated) */}
                        <text
                          x={node.x}
                          y={node.y + 3}
                          textAnchor="middle"
                          className="text-[10px] fill-foreground font-medium"
                        >
                          {node.name.length > 12 
                            ? node.name.slice(0, 10) + '...' 
                            : node.name}
                        </text>
                      </g>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="font-medium text-xs">{node.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {node.connections} connection{node.connections !== 1 ? 's' : ''}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </svg>
        </div>

        {/* Selected node info */}
        {selectedNode && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">
              {nodes.find(n => n.id === selectedNode)?.name}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {edges
                .filter(e => e.source === selectedNode || e.target === selectedNode)
                .map(edge => {
                  const otherNode = nodes.find(
                    n => n.id === (edge.source === selectedNode ? edge.target : edge.source)
                  );
                  const isSource = edge.source === selectedNode;
                  return (
                    <Badge 
                      key={edge.id} 
                      variant="outline" 
                      className="text-xs"
                      style={{ borderColor: typeConfig[edge.type].color }}
                    >
                      {isSource ? '→' : '←'} {otherNode?.name}
                      {edge.lagDays && ` (${edge.lagDays}d)`}
                    </Badge>
                  );
                })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
