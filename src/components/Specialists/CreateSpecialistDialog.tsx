import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Loader2, Bell, ShieldAlert, AlertTriangle, Info, SlidersHorizontal } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MetricChips } from '@/components/Specialists/CreateWizard/MetricChips';
import { useSpecialists } from '@/contexts/SpecialistsContext';
import { useMetrics } from '@/contexts/MetricsContext';
import { runSpecialist } from '@/services/specialistRunService';
import { generateHandle } from '@/utils/handle';
import {
  matchSuggestedMetrics,
  autoGenerateRulesFromMetrics,
  BUSINESS_VIEW_TO_DOMAIN,
} from '@/utils/specialistDefaults';
import { cn } from '@/lib/utils';
import type { BusinessView, MetricConfig, MonitoringRule, NotificationConfig } from '@/types/specialist';

// ─── Types ───────────────────────────────────────────────────────────

interface CreateSpecialistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  galenAction: {
    type: 'create_specialist';
    suggestedName: string;
    suggestedBusinessView: BusinessView;
    suggestedMetrics: string[];
    suggestedDescription: string;
  };
}

// ─── Severity badge config ──────────────────────────────────────────

const SEVERITY_BADGE: Record<string, { icon: typeof ShieldAlert; className: string }> = {
  critical: { icon: ShieldAlert, className: 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400' },
  high: { icon: AlertTriangle, className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' },
  medium: { icon: Info, className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400' },
  low: { icon: Info, className: 'bg-muted text-muted-foreground' },
};

const FREQUENCY_OPTIONS: { value: NotificationConfig['frequency']; label: string; desc: string }[] = [
  { value: 'realtime', label: 'Real-time', desc: 'Immediate alerts' },
  { value: 'daily', label: 'Daily', desc: 'Daily digest' },
  { value: 'weekly', label: 'Weekly', desc: 'Weekly summary' },
];

// ─── Component ───────────────────────────────────────────────────────

export function CreateSpecialistDialog({
  open,
  onOpenChange,
  galenAction,
}: CreateSpecialistDialogProps) {
  const navigate = useNavigate();
  const { addSpecialist } = useSpecialists();
  const { metrics: allSystemMetrics } = useMetrics();

  // ── Form state ──
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [metrics, setMetrics] = useState<MetricConfig[]>([]);
  const [runImmediately, setRunImmediately] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [frequency, setFrequency] = useState<NotificationConfig['frequency']>('daily');

  // ── Initialize fields when dialog opens ──
  useEffect(() => {
    if (!open) return;
    setName(galenAction.suggestedName);
    setDescription(galenAction.suggestedDescription);
    setMetrics(matchSuggestedMetrics(galenAction.suggestedMetrics, allSystemMetrics));
    setRunImmediately(true);
    setIsCreating(false);
    setFrequency('daily');
  }, [open, galenAction, allSystemMetrics]);

  // ── Auto-generate rules (recomputed when metrics change) ──
  const autoRules = useMemo(
    () => autoGenerateRulesFromMetrics(metrics, allSystemMetrics),
    [metrics, allSystemMetrics],
  );

  // ── Create handler ──
  const handleCreate = async () => {
    if (!name.trim() || isCreating) return;
    setIsCreating(true);

    try {
      const businessView = galenAction.suggestedBusinessView;

      const notifications: NotificationConfig = {
        channels: { inApp: true, email: false, slack: false },
        frequency,
        severityFilter: ['critical', 'high', 'medium'],
      };

      const newId = await addSpecialist({
        name: name.trim(),
        handle: generateHandle(name) || 'specialist',
        description: description.trim(),
        templateId: '',
        domain: BUSINESS_VIEW_TO_DOMAIN[businessView] as any,
        status: 'active',
        createdBy: 'user',
        monitoringScope: {
          dataSources: [],
          refreshRate: frequency === 'realtime' ? 'realtime' : 'hourly',
          metrics: metrics.map((m) => m.name),
        },
        monitoringRules: autoRules,
        performance: {
          insightsGenerated: 0,
          actionsRecommended: 0,
          actionsApproved: 0,
          falsePositiveRate: 0,
          valueDelivered: 0,
          approvalRate: 0,
        },
        businessView,
        metrics,
        drivers: [],
        knowledgeBase: { files: [], instructions: '' },
        notifications,
      });

      // Trigger run in background if toggled on
      if (runImmediately && newId) {
        runSpecialist(newId, 'manual').catch((err) =>
          console.error('[CreateSpecialistDialog] Auto-run failed:', err),
        );
      }

      onOpenChange(false);
      navigate(`/specialists/${newId}`, {
        state: { initialRunning: runImmediately },
      });
    } catch (err) {
      console.error('[CreateSpecialistDialog] Failed to create specialist:', err);
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Create Specialist
          </DialogTitle>
          <DialogDescription>
            Review the suggested configuration and create a specialist for continuous monitoring.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="specialist-name" className="text-sm font-medium">
                Name
              </Label>
              <Input
                id="specialist-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Specialist name"
                className="h-9"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="specialist-desc" className="text-sm font-medium">
                Description
              </Label>
              <Textarea
                id="specialist-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What does this specialist monitor?"
                rows={2}
                className="resize-none text-sm"
              />
            </div>

            {/* Metrics (editable via MetricChips) */}
            <MetricChips
              label="Metrics"
              sublabel="Add or remove metrics to monitor"
              metrics={metrics}
              onChange={setMetrics}
              accentColor="bg-primary/10 text-primary"
            />

            {/* Link to full wizard for dimensions & filters */}
            <button
              type="button"
              onClick={() => {
                onOpenChange(false);
                navigate('/specialists/new', {
                  state: {
                    prefill: {
                      type: 'create_specialist',
                      suggestedName: name,
                      suggestedDescription: description,
                      suggestedBusinessView: galenAction.suggestedBusinessView,
                      suggestedMetrics: metrics.map((m) => m.name),
                    },
                  },
                });
              }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <SlidersHorizontal className="h-3 w-3" />
              Configure breakdowns &amp; filters &rarr;
            </button>

            {/* Auto-generated Alerts Preview */}
            {autoRules.length > 0 && (
              <div className="space-y-2 border-t border-border/40 pt-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Monitoring Rules</Label>
                  <span className="text-[11px] text-muted-foreground">
                    Auto-generated &middot; {autoRules.length} rule{autoRules.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {autoRules.map((rule) => {
                    const sev = SEVERITY_BADGE[rule.severity] || SEVERITY_BADGE.medium;
                    const SevIcon = sev.icon;
                    return (
                      <div
                        key={rule.id}
                        className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/30 px-3 py-2"
                      >
                        <SevIcon className={cn('h-3.5 w-3.5 shrink-0', sev.className.split(' ').find(c => c.startsWith('text-')))} />
                        <span className="text-[13px] text-foreground/80 flex-1 min-w-0 truncate">
                          {rule.name}
                        </span>
                        <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5 font-medium', sev.className)}>
                          {rule.severity}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
                {autoRules.some((r) => r.reason) && (
                  <p className="text-[11px] text-muted-foreground/60 leading-relaxed">
                    Rules are auto-configured based on current metric health. You can fine-tune them after creation.
                  </p>
                )}
              </div>
            )}

            {/* Notifications */}
            <div className="space-y-2.5 border-t border-border/40 pt-4">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Alert Frequency</Label>
              </div>
              <div className="flex gap-2">
                {FREQUENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFrequency(opt.value)}
                    className={cn(
                      'flex-1 rounded-lg border px-3 py-2 text-center transition-colors',
                      frequency === opt.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border/60 hover:border-border',
                    )}
                  >
                    <p className={cn(
                      'text-sm font-medium',
                      frequency === opt.value ? 'text-primary' : 'text-foreground',
                    )}>
                      {opt.label}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Run toggle */}
            <div className="flex items-center justify-between border-t border-border/40 pt-4">
              <div className="space-y-0.5">
                <Label htmlFor="run-toggle" className="text-sm font-medium cursor-pointer">
                  Run analysis immediately
                </Label>
                <p className="text-xs text-muted-foreground">
                  Start monitoring right after creation
                </p>
              </div>
              <Switch
                id="run-toggle"
                checked={runImmediately}
                onCheckedChange={setRunImmediately}
              />
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim() || isCreating}
            className="gap-1.5"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Create
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
