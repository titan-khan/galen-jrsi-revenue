import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Agent } from '@/types/agent';
import { Shield, CheckCircle2, Zap, TrendingUp, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustProgressCardProps {
  agent: Agent;
  onGrantAutonomy?: (actionType: string) => void;
}

const getTrustLevel = (score: number) => {
  if (score >= 80) return { label: 'High Trust', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: Shield };
  if (score >= 50) return { label: 'Building Trust', color: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: TrendingUp };
  return { label: 'Learning', color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: Zap };
};

const availableActionTypes = [
  { id: 'notifications', name: 'Send Notifications', description: 'Send alerts and notifications automatically' },
  { id: 'reports', name: 'Generate Reports', description: 'Create and distribute scheduled reports' },
  { id: 'adjustments', name: 'Minor Adjustments', description: 'Make small configuration changes' },
  { id: 'escalations', name: 'Auto-Escalate', description: 'Escalate issues to relevant teams' },
];

export function TrustProgressCard({ agent, onGrantAutonomy }: TrustProgressCardProps) {
  const trustScore = agent.trustScore ?? 0;
  const trustLevel = getTrustLevel(trustScore);
  const TrustIcon = trustLevel.icon;
  const autoApproved = agent.autoApprovedActionTypes || [];
  const consecutiveSuccesses = agent.consecutiveSuccesses ?? 0;

  const progressToNextLevel = trustScore >= 80 
    ? 100 
    : trustScore >= 50 
      ? ((trustScore - 50) / 30) * 100 
      : (trustScore / 50) * 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            Trust & Autonomy
          </CardTitle>
          <Badge variant="outline" className={trustLevel.color}>
            <TrustIcon className="h-3 w-3 mr-1" />
            {trustLevel.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trust Score */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Trust Score</span>
            <span className="font-semibold">{trustScore}%</span>
          </div>
          <Progress value={trustScore} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Learning</span>
            <span>Building</span>
            <span>High Trust</span>
          </div>
        </div>

        {/* Success Streak */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span className="text-sm">Consecutive Successes</span>
          </div>
          <span className="text-lg font-bold">{consecutiveSuccesses}</span>
        </div>

        {/* Auto-Approved Actions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Auto-Approved Actions</span>
            <span className="text-xs text-muted-foreground">
              {autoApproved.length}/{availableActionTypes.length} enabled
            </span>
          </div>
          
          <div className="space-y-2">
            {availableActionTypes.map((action) => {
              const isApproved = autoApproved.includes(action.id);
              const canUnlock = trustScore >= 50 || isApproved;

              return (
                <div
                  key={action.id}
                  className={cn(
                    "flex items-center justify-between p-2.5 rounded-lg border transition-colors",
                    isApproved ? "bg-emerald-500/5 border-emerald-200" : "bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {isApproved ? (
                      <Unlock className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <div>
                      <div className="text-sm font-medium">{action.name}</div>
                      <div className="text-xs text-muted-foreground">{action.description}</div>
                    </div>
                  </div>
                  
                  {!isApproved && canUnlock && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onGrantAutonomy?.(action.id)}
                    >
                      Unlock
                    </Button>
                  )}
                  
                  {isApproved && (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">
                      Active
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Trust building tip */}
        {trustScore < 80 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Build trust:</span> Complete more successful runs to unlock additional autonomous capabilities.
              {trustScore < 50 && ' Reach 50% to start unlocking auto-approved actions.'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
