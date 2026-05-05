import { Bell, Mail, MessageSquare, Zap } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { NotificationConfig } from '@/types/specialist';

interface AlertsStepProps {
  config: NotificationConfig;
  onChange: (config: NotificationConfig) => void;
  runAfterCreate: boolean;
  onRunAfterCreateChange: (value: boolean) => void;
}

export const AlertsStep = ({ config, onChange, runAfterCreate, onRunAfterCreateChange }: AlertsStepProps) => {
  const updateChannel = (channel: 'inApp' | 'email' | 'slack', value: boolean) => {
    onChange({
      ...config,
      channels: { ...config.channels, [channel]: value },
    });
  };

  const updateFrequency = (frequency: NotificationConfig['frequency']) => {
    onChange({ ...config, frequency });
  };

  const toggleSeverity = (severity: 'critical' | 'high' | 'medium' | 'low') => {
    const current = config.severityFilter;
    const updated = current.includes(severity)
      ? current.filter((s) => s !== severity)
      : [...current, severity];
    onChange({ ...config, severityFilter: updated });
  };

  const FREQUENCY_OPTIONS: { value: NotificationConfig['frequency']; label: string }[] = [
    { value: 'realtime', label: 'Real-time' },
    { value: 'daily', label: 'Daily Digest' },
    { value: 'weekly', label: 'Weekly Report' },
  ];

  const SEVERITY_OPTIONS: { value: 'critical' | 'high' | 'medium' | 'low'; label: string; color: string }[] = [
    { value: 'critical', label: 'Critical', color: 'text-red-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'medium', label: 'Medium', color: 'text-amber-600' },
    { value: 'low', label: 'Low', color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-8">
      {/* Run After Creation Toggle */}
      <div className="rounded-xl border bg-primary/5 border-primary/20 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-3">
            <Zap className="h-4 w-4 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Run analysis after creation</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                The specialist will immediately analyze your data and generate insights
              </p>
            </div>
          </div>
          <Switch
            checked={runAfterCreate}
            onCheckedChange={onRunAfterCreateChange}
          />
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Alerts & Notifications</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure how you receive specialist alerts
        </p>
      </div>

      {/* Channels */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Channels</p>
        <div className="space-y-1 rounded-xl border overflow-hidden">
          {/* In-App */}
          <label className="flex items-start gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors">
            <Checkbox
              checked={config.channels.inApp}
              onCheckedChange={(checked) => updateChannel('inApp', !!checked)}
              className="mt-0.5"
            />
            <div className="flex items-start gap-2.5 flex-1">
              <Bell className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">In-App Notifications</p>
                <p className="text-xs text-muted-foreground">Get alerts in the Galen notification center</p>
              </div>
            </div>
          </label>

          <div className="border-t" />

          {/* Email */}
          <label className="flex items-start gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors">
            <Checkbox
              checked={config.channels.email}
              onCheckedChange={(checked) => updateChannel('email', !!checked)}
              className="mt-0.5"
            />
            <div className="flex items-start gap-2.5 flex-1">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-xs text-muted-foreground">Send digest to your email</p>
                {config.channels.email && (
                  <Input
                    value={config.emailRecipients?.[0] || ''}
                    onChange={(e) => onChange({
                      ...config,
                      emailRecipients: [e.target.value],
                    })}
                    placeholder="email@company.com"
                    className="mt-2 h-8 text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            </div>
          </label>

          <div className="border-t" />

          {/* Slack */}
          <label className="flex items-start gap-3 p-4 opacity-50 cursor-not-allowed">
            <Checkbox disabled className="mt-0.5" />
            <div className="flex items-start gap-2.5 flex-1">
              <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">
                  Slack
                  <span className="ml-2 text-xs font-normal text-muted-foreground">Coming Soon</span>
                </p>
                <p className="text-xs text-muted-foreground">Post to a Slack channel</p>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Frequency — segmented control */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Alert Frequency</p>
        <div className="inline-flex rounded-lg border border-border bg-muted/60 p-1">
          {FREQUENCY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => updateFrequency(option.value)}
              className={cn(
                'px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-150',
                config.frequency === option.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Severity Filter */}
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Severity Filter</p>
          <p className="text-xs text-muted-foreground">Only notify me for selected severity levels</p>
        </div>
        <div className="flex gap-3">
          {SEVERITY_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Checkbox
                checked={config.severityFilter.includes(option.value)}
                onCheckedChange={() => toggleSeverity(option.value)}
              />
              <span className={cn('text-sm font-medium', option.color)}>
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
