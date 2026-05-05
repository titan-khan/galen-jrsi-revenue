import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Agent, ScheduleFrequency, DayOfWeek } from '@/types/agent';
import { Clock, RefreshCw, Bell, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TrustProgressCard } from './TrustProgressCard';

interface AgentSettingsProps {
  agent: Agent;
  onUpdate?: (updates: Partial<Agent>) => void;
  onDelete?: () => void;
}

export function AgentSettings({ agent, onUpdate, onDelete }: AgentSettingsProps) {
  const [name, setName] = useState(agent.name);
  const [description, setDescription] = useState(agent.description);
  const [scheduleEnabled, setScheduleEnabled] = useState(agent.schedule?.enabled ?? false);
  const [scheduleFrequency, setScheduleFrequency] = useState<ScheduleFrequency>(
    agent.schedule?.frequency ?? 'daily'
  );
  const [scheduleDayOfWeek, setScheduleDayOfWeek] = useState<DayOfWeek>(
    agent.schedule?.dayOfWeek ?? 'monday'
  );
  const [scheduleHour, setScheduleHour] = useState(agent.schedule?.hour ?? 9);
  const [scheduleTimezone, setScheduleTimezone] = useState(agent.schedule?.timezone ?? 'UTC');
  const [anomalyThreshold, setAnomalyThreshold] = useState(agent.anomalyThreshold ?? 70);

  const handleSave = () => {
    onUpdate?.({
      name,
      description,
      schedule: scheduleEnabled
        ? {
            frequency: scheduleFrequency,
            enabled: true,
            dayOfWeek: scheduleFrequency === 'weekly' ? scheduleDayOfWeek : undefined,
            hour: ['daily', 'weekly'].includes(scheduleFrequency) ? scheduleHour : undefined,
            timezone: scheduleTimezone,
            checkIntervalMinutes: scheduleFrequency === 'continuous' ? 15 : undefined,
          }
        : undefined,
      anomalyThreshold,
      isMonitoring: scheduleEnabled && scheduleFrequency === 'continuous',
    });
    toast.success('Agent settings saved');
  };

  const handleGrantAutonomy = (actionType: string) => {
    const currentApproved = agent.autoApprovedActionTypes || [];
    if (!currentApproved.includes(actionType)) {
      onUpdate?.({
        autoApprovedActionTypes: [...currentApproved, actionType],
      });
      toast.success(`Unlocked: ${actionType}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Schedule Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Run Schedule</CardTitle>
            <Switch checked={scheduleEnabled} onCheckedChange={setScheduleEnabled} />
          </div>
        </CardHeader>
        {scheduleEnabled && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={scheduleFrequency}
                  onValueChange={(v) => setScheduleFrequency(v as ScheduleFrequency)}
                >
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

              {scheduleFrequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Select
                    value={scheduleDayOfWeek}
                    onValueChange={(v) => setScheduleDayOfWeek(v as DayOfWeek)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        [
                          'monday',
                          'tuesday',
                          'wednesday',
                          'thursday',
                          'friday',
                          'saturday',
                          'sunday',
                        ] as const
                      ).map((day) => (
                        <SelectItem key={day} value={day}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(scheduleFrequency === 'daily' || scheduleFrequency === 'weekly') && (
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select
                    value={String(scheduleHour)}
                    onValueChange={(v) => setScheduleHour(Number(v))}
                  >
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

              <div className="space-y-2">
                <Label>Timezone</Label>
                <Select value={scheduleTimezone} onValueChange={setScheduleTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
          </CardContent>
        )}
      </Card>

      {/* Anomaly Detection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Anomaly Detection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
              <span>Conservative</span>
              <span>Aggressive</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust & Autonomy */}
      <TrustProgressCard agent={agent} onGrantAutonomy={handleGrantAutonomy} />

      {/* Actions */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Agent
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>
    </div>
  );
}
