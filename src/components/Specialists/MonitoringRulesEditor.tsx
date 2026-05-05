import { useState } from 'react';
import { Plus, Trash2, AlertCircle, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MonitoringRule, MetricConfig } from '@/types/specialist';
import { cn } from '@/lib/utils';

// Condition options for the rule builder
const CONDITION_OPTIONS = [
  { value: 'drops below', label: 'drops below' },
  { value: 'exceeds', label: 'exceeds' },
  { value: 'changes by', label: 'changes by' },
  { value: 'falls below', label: 'falls below' },
  { value: 'increases by', label: 'increases by' },
  { value: 'decreases by', label: 'decreases by' },
];

const UNIT_OPTIONS = [
  { value: '%', label: '%' },
  { value: 'points', label: 'points' },
  { value: 'minutes', label: 'minutes' },
  { value: 'per month', label: '/month' },
  { value: 'per week', label: '/week' },
  { value: 'times/week', label: 'times/week' },
  { value: 'days', label: 'days' },
  { value: 'hours', label: 'hours' },
  { value: 'years', label: 'years' },
];

interface MonitoringRulesEditorProps {
  rules: MonitoringRule[];
  onChange: (rules: MonitoringRule[]) => void;
  availableMetrics?: MetricConfig[];
}

const SEVERITY_COLORS = {
  low: 'bg-blue-500/8 border-blue-500/20',
  medium: 'bg-amber-500/8 border-amber-500/20',
  high: 'bg-orange-500/8 border-orange-500/20',
  critical: 'bg-red-500/8 border-red-500/20',
};

const SEVERITY_DOT = {
  low: 'bg-blue-500',
  medium: 'bg-amber-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

export function MonitoringRulesEditor({ rules, onChange, availableMetrics }: MonitoringRulesEditorProps) {
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  const updateRule = (id: string, updates: Partial<MonitoringRule>) => {
    onChange(rules.map(rule => (rule.id === id ? { ...rule, ...updates } : rule)));
  };

  const deleteRule = (id: string) => {
    onChange(rules.filter(rule => rule.id !== id));
    setDeleteRuleId(null);
  };

  const addRule = () => {
    const newRule: MonitoringRule = {
      id: `rule-${Date.now()}`,
      name: 'New Alert',
      whenCondition: 'drops below',
      whenValue: 10,
      whenUnit: '%',
      forScope: 'All',
      severity: 'medium',
      enabled: true,
    };
    onChange([...rules, newRule]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            Monitoring Rules
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Define when this specialist should trigger alerts.
          </p>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg border-muted-foreground/30">
              <p className="text-sm text-muted-foreground mb-3">No rules configured yet.</p>
              <Button variant="outline" size="sm" onClick={addRule}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule, index) => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  index={index + 1}
                  availableMetrics={availableMetrics}
                  onChange={(updates) => updateRule(rule.id, updates)}
                  onDelete={() => setDeleteRuleId(rule.id)}
                />
              ))}
            </div>
          )}

          {rules.length > 0 && (
            <Button variant="outline" className="mt-3 w-full" size="sm" onClick={addRule}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Rule
            </Button>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteRuleId} onOpenChange={() => setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Rule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the monitoring rule. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteRuleId && deleteRule(deleteRuleId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface RuleCardProps {
  rule: MonitoringRule;
  index: number;
  availableMetrics?: MetricConfig[];
  onChange: (updates: Partial<MonitoringRule>) => void;
  onDelete: () => void;
}

function RuleCard({ rule, index, availableMetrics, onChange, onDelete }: RuleCardProps) {
  return (
    <div className={cn(
      'rounded-lg border p-3.5 space-y-3 transition-colors',
      SEVERITY_COLORS[rule.severity],
    )}>
      {/* Row 1: Name + Severity + Delete */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={cn('h-2 w-2 rounded-full shrink-0', SEVERITY_DOT[rule.severity])} />
          <Input
            value={rule.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="border-0 bg-transparent p-0 h-auto text-sm font-medium focus-visible:ring-0 shadow-none"
            placeholder="Rule name"
          />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Select value={rule.severity} onValueChange={(v) => onChange({ severity: v as MonitoringRule['severity'] })}>
            <SelectTrigger className="h-7 w-[90px] text-[11px] bg-background/60 border-border/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Row 2: Readable rule sentence: "Alert when [metric] [condition] [value][unit]" */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[11px] font-medium text-muted-foreground shrink-0">Alert when</span>

        {/* Condition (e.g., "drops below", "exceeds") */}
        <Select value={rule.whenCondition} onValueChange={(v) => onChange({ whenCondition: v })}>
          <SelectTrigger className="h-7 w-[120px] text-xs bg-background/60 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONDITION_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Threshold value */}
        <Input
          type="number"
          value={rule.whenValue}
          onChange={(e) => onChange({ whenValue: Number(e.target.value) })}
          className="h-7 w-[65px] text-xs text-center bg-background/60 border-border/50"
        />

        {/* Unit */}
        <Select value={rule.whenUnit || '%'} onValueChange={(v) => onChange({ whenUnit: v })}>
          <SelectTrigger className="h-7 w-[85px] text-xs bg-background/60 border-border/50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value} className="text-xs">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Scope */}
        <span className="text-[11px] font-medium text-muted-foreground shrink-0">for</span>
        <Input
          value={rule.forScope || ''}
          onChange={(e) => onChange({ forScope: e.target.value })}
          className="h-7 w-[120px] text-xs bg-background/60 border-border/50"
          placeholder="All routes"
        />
      </div>

      {/* Row 3: AI Reasoning (if present) */}
      {rule.reason && (
        <div className="flex items-start gap-2 pt-1 border-t border-border/40">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <span className="font-medium text-amber-600 dark:text-amber-500">Why recommended: </span>
            {rule.reason}
          </p>
        </div>
      )}
    </div>
  );
}
