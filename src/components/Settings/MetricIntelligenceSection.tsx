import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useOrganization } from "@/contexts/OrganizationContext";
import { Brain, Sparkles, TrendingUp, AlertTriangle, RefreshCw } from "lucide-react";

export const MetricIntelligenceSection = () => {
  const { companyProfile, contextCompleteness } = useOrganization();
  
  // Local state for AI settings (would be persisted in a real app)
  const [autoSuggest, setAutoSuggest] = useState(true);
  const [showBenchmarks, setShowBenchmarks] = useState(true);
  const [detectAnomalies, setDetectAnomalies] = useState(true);
  const [suggestRelationships, setSuggestRelationships] = useState(true);

  return (
    <div className="space-y-6">
      {/* Context Quality Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Intelligence Quality
          </CardTitle>
          <CardDescription>
            Better context leads to better recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Context Completeness</p>
              <p className="text-sm text-muted-foreground">
                {contextCompleteness >= 75 
                  ? "Great! Your context is well-defined."
                  : "Add more context to improve recommendations."}
              </p>
            </div>
            <Badge 
              variant={contextCompleteness >= 75 ? "default" : "secondary"}
              className="text-lg px-3 py-1"
            >
              {contextCompleteness}%
            </Badge>
          </div>
          
          {contextCompleteness < 75 && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-2">
                <AlertTriangle className="h-4 w-4 inline mr-1" />
                Missing context:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                {companyProfile.name === 'My Company' && <li>Company name</li>}
                {companyProfile.businessModels.length === 0 && <li>Business model</li>}
                {!companyProfile.northStarMetricId && <li>North Star metric</li>}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Features
          </CardTitle>
          <CardDescription>
            Configure how AI assists with metric discovery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-suggest">Auto-Suggest Metrics</Label>
              <p className="text-sm text-muted-foreground">
                Automatically suggest metrics when connecting new data sources
              </p>
            </div>
            <Switch
              id="auto-suggest"
              checked={autoSuggest}
              onCheckedChange={setAutoSuggest}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="benchmarks">Industry Benchmarks</Label>
              <p className="text-sm text-muted-foreground">
                Show industry benchmark comparisons where available
              </p>
            </div>
            <Switch
              id="benchmarks"
              checked={showBenchmarks}
              onCheckedChange={setShowBenchmarks}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="anomalies">Anomaly Detection</Label>
              <p className="text-sm text-muted-foreground">
                Automatically detect and alert on unusual metric behavior
              </p>
            </div>
            <Switch
              id="anomalies"
              checked={detectAnomalies}
              onCheckedChange={setDetectAnomalies}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="relationships">Relationship Discovery</Label>
              <p className="text-sm text-muted-foreground">
                Suggest leading/lagging indicator relationships
              </p>
            </div>
            <Switch
              id="relationships"
              checked={suggestRelationships}
              onCheckedChange={setSuggestRelationships}
            />
          </div>
        </CardContent>
      </Card>

      {/* Relationship Rules (placeholder for future) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Custom Relationship Rules
          </CardTitle>
          <CardDescription>
            Define your own leading/lagging indicator relationships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p className="mb-4">No custom rules defined yet.</p>
            <Button variant="outline" disabled>
              <RefreshCw className="h-4 w-4 mr-2" />
              Add Custom Rule
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
