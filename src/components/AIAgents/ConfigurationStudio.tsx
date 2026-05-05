import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AgentTemplate, AgentCategory, TimeRange, AgentMetricConfig, ScheduleFrequency, DayOfWeek } from '@/types/agent';
import { useAgents } from '@/contexts/AgentsContext';
import { MetricSelector } from './MetricSelector';
import { ArrowLeft, Save, Calendar, Clock, RefreshCw, Bell } from 'lucide-react';
import { toast } from 'sonner';

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: 'last-7-days', label: 'Last 7 days' },
  { value: 'last-30-days', label: 'Last 30 days' },
  { value: 'last-quarter', label: 'Last quarter' },
  { value: 'custom', label: 'Custom range' },
];

interface ConfigurationStudioProps {
  template: AgentTemplate | null;
  onBack: () => void;
}

export function ConfigurationStudio({ template, onBack }: ConfigurationStudioProps) {
  const navigate = useNavigate();
  const { addAgent } = useAgents();

  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [goal, setGoal] = useState('');
  const [selectedMetricIds, setSelectedMetricIds] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState<TimeRange>('last-30-days');
  
  // Schedule state
  const [scheduleEnabled, setScheduleEnabled] = useState(true);
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>('daily');
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState<DayOfWeek>('monday');
  const [scheduleHour, setScheduleHour] = useState(9);
  const [scheduleTimezone, setScheduleTimezone] = useState('UTC');
  const [anomalyThreshold, setAnomalyThreshold] = useState(70);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Please enter an agent name');
      return;
    }

    if (selectedMetricIds.length === 0) {
      toast.error('Please select at least one metric to monitor');
      return;
    }

    const category: AgentCategory = template?.category || 'operations';
    const monitoredMetrics: AgentMetricConfig[] = selectedMetricIds.map((id) => ({
      metricId: id,
    }));

    const newAgentId = await addAgent({
      name: name.trim(),
      description: description.trim(),
      goal: goal.trim(),
      templateId: template?.id || 'custom',
      category,
      status: 'active',
      monitoredMetrics,
      timeRange,
      createdBy: 'Current User',
      // Schedule configuration
      schedule: scheduleEnabled ? {
        frequency: scheduleFrequency,
        enabled: true,
        dayOfWeek: scheduleFrequency === 'weekly' ? scheduleDayOfWeek : undefined,
        hour: ['daily', 'weekly'].includes(scheduleFrequency) ? scheduleHour : undefined,
        timezone: scheduleTimezone,
        checkIntervalMinutes: scheduleFrequency === 'continuous' ? 15 : undefined,
      } : undefined,
      anomalyThreshold,
      isMonitoring: scheduleEnabled && scheduleFrequency === 'continuous',
      // Initial trust/tracking values
      trustScore: 0,
      consecutiveSuccesses: 0,
      totalRuns: 0,
    });

    toast.success('Agent created successfully');
    navigate(`/ai-agents/${newAgentId}?autostart=true`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Configure Agent
            {template && (
              <Badge variant="secondary" className="ml-3">
                {template.name}
              </Badge>
            )}
          </h2>
          <p className="text-muted-foreground">
            Step 2 of 2: Define the agent's identity, metrics, and governance settings.
          </p>
        </div>
      </div>

      {/* Identity Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Identity</h3>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter a descriptive name for this agent"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this agent does"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal">Goal / Objective</Label>
            <Textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What should this agent achieve? e.g., 'Reduce return rate below 3%' or 'Identify revenue opportunities'"
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Metrics Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Metrics Context</h3>
        <MetricSelector
          selectedMetricIds={selectedMetricIds}
          onSelectionChange={setSelectedMetricIds}
        />
      </div>

      {/* Analysis Scope */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Analysis Scope</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="timeRange">Time Range</Label>
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeRangeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Schedule Configuration */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-foreground">Run Schedule</h3>
            <p className="text-sm text-muted-foreground">
              Configure when this agent runs its analysis
            </p>
          </div>
          <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
        </div>

        {scheduleEnabled && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Frequency selector */}
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={scheduleFrequency} onValueChange={(v) => setScheduleFrequency(v as ScheduleFrequency)}>
                <SelectTrigger>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="continuous">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Continuous
                    </div>
                  </SelectItem>
                  <SelectItem value="hourly">Hourly</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Day of week (for weekly) */}
            {scheduleFrequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Day</Label>
                <Select value={scheduleDayOfWeek} onValueChange={(v) => setScheduleDayOfWeek(v as DayOfWeek)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const).map(day => (
                      <SelectItem key={day} value={day}>{day.charAt(0).toUpperCase() + day.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Hour (for daily/weekly) */}
            {(scheduleFrequency === 'daily' || scheduleFrequency === 'weekly') && (
              <div className="space-y-2">
                <Label>Time</Label>
                <Select value={String(scheduleHour)} onValueChange={(v) => setScheduleHour(Number(v))}>
                  <SelectTrigger>
                    <Clock className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Timezone */}
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select value={scheduleTimezone} onValueChange={setScheduleTimezone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="America/New_York">Eastern Time</SelectItem>
                  <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {scheduleEnabled && scheduleFrequency === 'continuous' && (
          <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-200 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Agent will continuously monitor metrics and trigger analysis when anomalies are detected
            </span>
          </div>
        )}
      </div>

      {/* Anomaly Detection */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Anomaly Detection
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure sensitivity for automatic anomaly alerts
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Detection Sensitivity</Label>
            <span className="text-sm font-medium">{anomalyThreshold}%</span>
          </div>
          <Slider
            value={[anomalyThreshold]}
            onValueChange={(v) => setAnomalyThreshold(v[0])}
            min={0}
            max={100}
            step={5}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Conservative (fewer alerts)</span>
            <span>Aggressive (more alerts)</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => navigate('/ai-agents')}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Create Agent
        </Button>
      </div>
    </div>
  );
}
